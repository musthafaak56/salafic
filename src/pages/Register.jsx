import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleRegister() {
    await register('user')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Registration is coming soon. For now you can continue as a user."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Button onClick={handleRegister} className="w-full">
        Continue as a user
      </Button>
    </AuthLayout>
  )
}
