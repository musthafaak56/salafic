import { text, email } from './domain.js'

export function communityFields(kind, data = {}) {
  if (kind === 'madrasa') {
    const classes = data.classes || []
    if (!Array.isArray(classes) || classes.length > 30) throw new Error('Add up to 30 classes.')
    return {
      name: text(data.name || '', 120, false),
      description: text(data.description || '', 3000, false),
      contactEmail: data.contactEmail ? email(data.contactEmail) : '',
      phone: text(data.phone || '', 40, false),
      classes: classes.map((item) => ({
        name: text(item.name, 120),
        schedule: text(item.schedule, 300),
        teacher: text(item.teacher || '', 120, false),
      })),
    }
  }
  if (kind === 'committee') {
    const members = data.members || []
    if (!Array.isArray(members) || members.length > 50) throw new Error('Add up to 50 committee members.')
    return {
      description: text(data.description || '', 3000, false),
      members: members.map((item) => ({ name: text(item.name, 120), role: text(item.role, 120) })),
    }
  }
  throw new Error('Choose madrasa or committee.')
}
