import { doc, getDoc, setDoc } from "firebase/firestore";
import { text, email, validId } from "../../functions/domain.js";

export async function submitSparkForm(
  db,
  centerId,
  { formId, answers, submissionId },
) {
  const form = await getDoc(
    doc(db, "masjids", validId(centerId), "forms", validId(formId)),
  );
  if (!form.exists() || !form.data().open)
    throw new Error("This form is not accepting responses.");
  if (!answers || JSON.stringify(answers).length > 30000)
    throw new Error("Invalid or oversized answers.");
  const fields = form.data().fields,
    clean = {};
  if (Object.keys(answers).some((k) => !fields.some((f) => f.id === k)))
    throw new Error("Unknown question.");
  for (const f of fields) {
    const a = answers[f.id] ?? (f.type === "checkbox" ? [] : "");
    if (f.type === "checkbox") {
      if (
        !Array.isArray(a) ||
        a.length > 50 ||
        a.some((v) => !f.options.includes(v)) ||
        (f.required && !a.length)
      )
        throw new Error(`Check ${f.label}.`);
    } else {
      text(a, 2000, f.required);
      if (a && ["select", "radio"].includes(f.type) && !f.options.includes(a))
        throw new Error(`Check ${f.label}.`);
      if (a && f.type === "email") email(a);
      if (a && f.type === "number" && !Number.isFinite(Number(a)))
        throw new Error(`Check ${f.label}.`);
    }
    clean[f.id] = a;
  }
  await setDoc(
    doc(db, "masjids", centerId, "formSubmissions", validId(submissionId)),
    { formId, answers: clean, createdAt: new Date().toISOString() },
  );
  return { ok: true };
}
