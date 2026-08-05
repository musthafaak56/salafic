export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 py-8 ${className}`}>
      {children}
    </div>
  )
}
