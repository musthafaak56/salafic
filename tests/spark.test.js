import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { createSparkActions } from "../src/lib/sparkActions.js";
import { resolveMapLocation } from "../src/lib/sparkMaps.js";
import { submitSparkForm } from "../src/lib/sparkForms.js";
import { DEFAULT_PRAYER } from "../functions/domain.js";
let env;
const identities = {
  super: "musthafaak56@gmail.com",
  applicant: "applicant@example.com",
  owner: "owner@example.com",
  editor: "editor@example.com",
  finance: "finance@example.com",
  outsider: "outsider@example.com",
};
const dbs = {},
  actions = {};
const fields = {
  displayName: "Free plan center",
  type: "masjid",
  city: "Dubai",
  countryCode: "AE",
  address: "Test location",
  mapsUrl: "https://www.google.com/maps?q=25.2048,55.2708",
  currency: "AED",
  locale: "en",
  slug: "free-plan-center",
  designatedAdminEmail: identities.owner,
};
before(async () => {
  env = await initializeTestEnvironment({
    projectId: `demo-spark-${Date.now()}`,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  for (const [uid, email] of Object.entries(identities)) {
    dbs[uid] = env
      .authenticatedContext(uid, { email, email_verified: true })
      .firestore();
    actions[uid] = createSparkActions(dbs[uid], () => ({
      uid,
      email,
      emailVerified: true,
    }));
  }
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "platformRoles", "super"), {
      role: "superadmin",
      email: identities.super,
    }),
  );
});
after(async () => env?.cleanup());

test("superadmin creates centers directly without approval; other users cannot", async () => {
  const input = { ...fields, slug: 'direct-super-center' };
  for (const uid of ['applicant', 'owner', 'editor', 'finance', 'outsider'])
    await assert.rejects(actions[uid]('createCenter', { fields: input }));
  const result = await actions.super('createCenter', { fields: input });
  const ref = doc(dbs.super, 'masjids', result.id);
  const center = (await getDoc(ref)).data();
  assert.equal(center.status, 'draft');
  assert.equal(center.timezone, 'Asia/Dubai');
  assert.equal(center.latitude, 25.2048);
  assert.equal(center.version, 1);
  assert.deepEqual(center.prayer, DEFAULT_PRAYER);
  assert.equal((await getDoc(doc(dbs.super, 'centerApplications', result.id))).exists(), false);
  assert.equal((await getDoc(doc(dbs.super, 'centerInvitations', result.id))).exists(), false);
  assert.equal((await getDoc(doc(dbs.super, 'centerSlugs', result.slug))).data().centerId, result.id);
  await assert.rejects(actions.super('createCenter', { fields: input }), /already in use/);
  const anonymous = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, 'masjids', result.id)));
  const emailOnly = env.authenticatedContext('email-only', { email: identities.super, email_verified: true }).firestore();
  const unverified = env.authenticatedContext('super', { email: identities.super, email_verified: false }).firestore();
  for (const db of [anonymous, dbs.owner, dbs.outsider, emailOnly, unverified])
    await assertFails(setDoc(doc(db, 'masjids', 'forged-direct'), center));
  await assertFails(setDoc(doc(dbs.super, 'masjids', 'missing-slug'), { ...center, slug: 'missing-slug' }));
  for (const invalid of [{ version: 2 }, { status: 'published' }, { displayName: 'x'.repeat(121) }, { unexpected: true }]) {
    const id = `invalid-${Object.keys(invalid)[0]}`;
    const batch = writeBatch(dbs.super);
    batch.set(doc(dbs.super, 'masjids', id), { ...center, slug: id, ...invalid });
    batch.set(doc(dbs.super, 'centerSlugs', id), { centerId: id });
    await assertFails(batch.commit());
  }
  await actions.super('settings', { centerId: result.id, fields: center, published: true, version: 1 });
  await assertSucceeds(getDoc(doc(anonymous, 'masjids', result.id)));
});

test("superadmin can operate all center-admin workspaces without center membership", async () => {
  const { id } = await actions.super('createCenter', { fields: { ...fields, slug: 'superadmin-capabilities' } });
  const run = (action, data = {}) => actions.super(action, { centerId: id, ...data });
  const root = (...path) => doc(dbs.super, 'masjids', id, ...path);
  assert.equal((await getDoc(root('members', 'super'))).exists(), false);
  await run('auditCenterAccess');
  let center = (await getDoc(root())).data();
  await run('settings', { fields: center, published: true, version: center.version });
  for (const kind of ['madrasa', 'committee']) {
    center = (await getDoc(root())).data();
    await run('saveCommunity', { kind, version: center.version, fields: kind === 'madrasa' ? { name: 'Madrasa', classes: [] } : { members: [{ name: 'Member', role: 'Secretary' }] } });
  }
  await run('saveDraft', { kind: 'prayer', version: 0, payload: DEFAULT_PRAYER });
  let draft = (await getDoc(root('contentDrafts', 'prayer-prayer'))).data();
  await run('publish', { kind: 'prayer', token: draft.token });
  await run('openingBalance', { amount: '10' });
  await run('ledger', { kind: 'funds', id: 'donation', amount: '25' });
  await run('ledger', { kind: 'expenses', id: 'expense', amount: '5' });
  await run('reverseEntry', { kind: 'expenses', id: 'expense', reason: 'Correction' });
  await run('reconcileFinance');
  await run('saveDraft', { kind: 'finance', version: 0 });
  draft = (await getDoc(root('contentDrafts', 'finance-finance'))).data();
  await run('publish', { kind: 'finance', token: draft.token });
  assert.equal((await getDoc(root('publicFinance', 'current'))).data().balanceMinor, 3500);
  for (const [collectionName, payload] of [
    ['events', { title: 'Class', eventLocal: '2027-12-01T18:00' }],
    ['forms', { title: 'Registration', open: true, fields: [{ id: 'name', label: 'Name', type: 'text', required: true, options: [] }] }],
  ]) {
    const item = await run('contentWrite', { collection: collectionName, draft: true, payload });
    await run('contentWrite', { collection: collectionName, id: item.id, publish: true, token: item.token });
    await assertSucceeds(getDoc(root(collectionName, item.id)));
  }
  const cls = await run('saveEducation', { entity: 'classes', fields: { name: 'Class', kind: 'center' } });
  await run('saveEducation', { entity: 'teachers', fields: { name: 'Teacher', classIds: [cls.id] } });
  await run('saveEducation', { entity: 'students', fields: { name: 'Student', kind: 'center', classIds: [cls.id] } });
  for (const name of ['educationStudents', 'educationTeachers', 'formSubmissions', 'auditLogs'])
    await assertSucceeds(getDocs(collection(dbs.super, 'masjids', id, name)));
  await run('inviteMember', { email: identities.outsider, role: 'admin' });
  const invite = (await actions.outsider('session')).invitations.find(i => i.centerId === id);
  await actions.outsider('acceptInvitation', { id: invite.id });
  await run('changeMemberRole', { uid: 'outsider', role: 'editor' });
  await run('removeMember', { uid: 'outsider' });
  assert.equal((await getDoc(root('members', 'super'))).exists(), false);
});

test("full Spark workflow, permissions, public data and replay protection", async () => {
  const app = await actions.applicant("submitApplication", { fields });
  const id = app.id,
    root = (db, ...p) => doc(db, "masjids", id, ...p);
  console.log("request submitted");
  await assert.rejects(
    actions.outsider("reviewApplication", { id, status: "approved" }),
  );
  await actions.super("reviewApplication", { id, status: "approved" });
  await actions.super("reviewApplication", { id, status: "approved" });
  console.log("request approved");
  const session = await actions.owner("session");
  assert.equal(session.invitations.length, 1);
  await assert.rejects(actions.outsider("acceptInvitation", { id }));
  await actions.owner("acceptInvitation", { id });
  await assert.rejects(actions.owner("acceptInvitation", { id }));
  assert.equal((await actions.owner("session")).centers[0].role, "owner");
  console.log("owner accepted");
  let center = (await getDoc(root(dbs.owner))).data();
  await actions.owner("settings", {
    centerId: id,
    fields: center,
    published: true,
    version: center.version,
  });
  for (const role of ["editor", "finance"]) {
    await actions.owner("inviteMember", {
      centerId: id,
      email: identities[role],
      role,
    });
    const invitation = (await actions[role]("session")).invitations[0];
    await actions[role]("acceptInvitation", { id: invitation.id });
  }
  console.log("team invited");
  center = (await getDoc(root(dbs.owner))).data();
  await actions.editor("saveCommunity", {
    centerId: id,
    kind: "madrasa",
    version: center.version,
    fields: {
      name: "Madrasa",
      classes: [{ name: "Quran", schedule: "Saturday", teacher: "" }],
    },
  });
  center = (await getDoc(root(dbs.owner))).data();
  await assert.rejects(
    actions.editor("saveCommunity", {
      centerId: id,
      kind: "committee",
      version: center.version,
      fields: { members: [] },
    }),
  );
  await actions.owner("saveCommunity", {
    centerId: id,
    kind: "committee",
    version: center.version,
    fields: { members: [{ name: "Test member", role: "Secretary" }] },
  });
  console.log("community saved");
  await assertFails(
    setDoc(doc(dbs.outsider, "platformRoles", "outsider"), {
      role: "superadmin",
    }),
  );
  await assertFails(
    updateDoc(root(dbs.editor, "members", "editor"), { role: "owner" }),
  );
  await assertFails(
    updateDoc(root(dbs.editor), { status: "draft", version: 99 }),
  );
  await assertFails(
    updateDoc(root(dbs.editor), {
      madrasa: { name: "x".repeat(121) },
      version: center.version + 2,
    }),
  );
  await actions.editor("saveDraft", {
    centerId: id,
    kind: "prayer",
    version: 0,
    payload: {
      ...DEFAULT_PRAYER,
      offsets: { ...DEFAULT_PRAYER.offsets, fajr: 3 },
    },
  });
  let draft = (
    await getDoc(root(dbs.editor, "contentDrafts", "prayer-prayer"))
  ).data();
  await assert.rejects(
    actions.editor("publish", { centerId: id, kind: "prayer", token: "wrong" }),
  );
  await actions.editor("publish", {
    centerId: id,
    kind: "prayer",
    token: draft.token,
  });
  console.log("prayer published");
  await actions.finance("openingBalance", { centerId: id, amount: "10" });
  await actions.finance("ledger", {
    centerId: id,
    kind: "funds",
    id: "donation",
    amount: "25",
    note: "Private donor",
    category: "General",
  });
  await actions.finance("ledger", {
    centerId: id,
    kind: "funds",
    id: "donation",
    amount: "25",
  });
  await actions.finance("ledger", {
    centerId: id,
    kind: "expenses",
    id: "expense",
    amount: "5",
  });
  await assertFails(
    updateDoc(root(dbs.finance, "funds", "donation"), { amountMinor: 999 }),
  );
  await actions.finance("reverseEntry", {
    centerId: id,
    kind: "expenses",
    id: "expense",
    reason: "Duplicate",
  });
  await assert.rejects(
    actions.finance("reverseEntry", {
      centerId: id,
      kind: "expenses",
      id: "expense",
      reason: "Again",
    }),
  );
  await actions.finance("reconcileFinance", { centerId: id });
  await actions.finance("saveDraft", {
    centerId: id,
    kind: "finance",
    version: 0,
  });
  draft = (
    await getDoc(root(dbs.finance, "contentDrafts", "finance-finance"))
  ).data();
  await actions.finance("publish", {
    centerId: id,
    kind: "finance",
    token: draft.token,
  });
  const report = (
    await getDoc(root(dbs.finance, "publicFinance", "current"))
  ).data();
  assert.equal(report.balanceMinor, 3500);
  console.log("finance published");
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(root(anon, "publicFinance", "current")));
  await assertFails(getDoc(root(anon, "funds", "donation")));
  await assertFails(getDoc(root(dbs.editor, "funds", "donation")));
  await assertFails(getDoc(root(dbs.outsider, "funds", "donation")));
  const event = await actions.editor("contentWrite", {
    centerId: id,
    collection: "events",
    draft: true,
    payload: { title: "Class", eventLocal: "2026-12-01T18:00" },
  });
  await actions.editor("contentWrite", {
    centerId: id,
    collection: "events",
    id: event.id,
    publish: true,
    token: event.token,
  });
  const form = await actions.editor("contentWrite", {
    centerId: id,
    collection: "forms",
    draft: true,
    payload: {
      title: "Registration",
      open: true,
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          required: true,
          options: [],
        },
      ],
    },
  });
  await actions.editor("contentWrite", {
    centerId: id,
    collection: "forms",
    id: form.id,
    publish: true,
    token: form.token,
  });
  await submitSparkForm(anon, id, {
    formId: form.id,
    submissionId: "response",
    answers: { name: "Visitor" },
  });
  await assertFails(getDoc(root(anon, "formSubmissions", "response")));
  await assertFails(
    setDoc(root(anon, "formSubmissions", "bad"), {
      formId: form.id,
      answers: { name: "x".repeat(2001) },
      createdAt: new Date().toISOString(),
    }),
  );
  await assertFails(
    setDoc(root(anon, "formSubmissions", "extra"), {
      formId: form.id,
      answers: { name: "Visitor", role: "admin" },
      createdAt: new Date().toISOString(),
    }),
  );
  console.log("content and public forms saved");
  await actions.owner("changeMemberRole", {
    centerId: id,
    uid: "editor",
    role: "admin",
  });
  await actions.owner("transferOwnership", { centerId: id, uid: "editor" });
  assert.equal((await actions.editor("session")).centers[0].role, "owner");
  await actions.editor("removeMember", { centerId: id, uid: "finance" });
  assert.equal((await actions.finance("session")).centers.length, 0);
  await assertFails(getDoc(root(dbs.finance, "funds", "donation")));
  const forged = writeBatch(dbs.outsider);
  forged.set(root(dbs.outsider, "members", "outsider"), {
    uid: "outsider",
    email: identities.outsider,
    role: "owner",
    joinedAt: new Date().toISOString(),
    invitationId: id,
  });
  forged.set(doc(dbs.outsider, "userCenters", "outsider", "centers", id), {
    centerId: id,
    role: "owner",
  });
  await assertFails(forged.commit());
  await assertSucceeds(
    getDocs(
      query(collection(anon, "masjids"), where("status", "==", "published")),
    ),
  );
});

test("Maps resolves offline and rejects shortened and camera-only URLs", () => {
  assert.equal(resolveMapLocation(fields.mapsUrl).timezone, "Asia/Dubai");
  assert.throws(() => resolveMapLocation("https://maps.app.goo.gl/example"));
  assert.throws(() =>
    resolveMapLocation("https://www.google.com/maps/@25,55,10z"),
  );
});

test("editor maximum sizes fit security-rule limits", async () => {
  const {id} = await actions.super('submitApplication',{fields:{...fields,slug:'bounded-center'}})
  await actions.super('reviewApplication',{id,status:'approved'})
  await actions.owner('acceptInvitation',{id})
  const root=doc(dbs.owner,'masjids',id)
  let c=(await getDoc(root)).data()
  await actions.owner('saveCommunity',{centerId:id,kind:'madrasa',version:c.version,fields:{classes:Array.from({length:8},(_,i)=>({name:`Class ${i}`,teacher:'Teacher',schedule:'Saturday'}))}})
  c=(await getDoc(root)).data()
  await actions.owner('saveCommunity',{centerId:id,kind:'committee',version:c.version,fields:{members:Array.from({length:12},(_,i)=>({name:`Member ${i}`,role:'Committee'}))}})
  c=(await getDoc(root)).data()
  await actions.owner('settings',{centerId:id,fields:c,published:true,version:c.version})
  const questions=Array.from({length:4},(_,i)=>({id:`q${i}`,label:`Question ${i}`,type:i < 2 ? 'select' : 'text',required:true,options:i < 2 ? Array.from({length:10},(_,j)=>`Option ${j}`) : []}))
  const f=await actions.owner('contentWrite',{centerId:id,collection:'forms',draft:true,payload:{title:'Bounded form',open:true,fields:questions}})
  await actions.owner('contentWrite',{centerId:id,collection:'forms',id:f.id,publish:true,token:f.token})
  const liveForm = doc(dbs.owner,'masjids',id,'forms',f.id)
  const live = (await getDoc(liveForm)).data()
  await assertFails(updateDoc(liveForm,{fields:[{...questions[0],options:[42]}]}))
  await assertFails(updateDoc(liveForm,{fields:[{...questions[0],options:['x'.repeat(2001)]}]}))
  assert.deepEqual((await getDoc(liveForm)).data(),live)
  await submitSparkForm(env.unauthenticatedContext().firestore(),id,{formId:f.id,submissionId:'max-response',answers:Object.fromEntries(questions.map(q=>[q.id,'Option 0']))})
  await actions.owner('ledger',{centerId:id,kind:'funds',id:'first',amount:'1'})
})
