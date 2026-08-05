export default function Card({ children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`rounded-xl border border-line bg-surface ${className}`}>
      {children}
    </Tag>
  )
}
