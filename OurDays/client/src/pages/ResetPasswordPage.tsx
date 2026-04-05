import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-4 text-5xl">❌</div>
        <h1 className="mb-2 font-display text-2xl font-bold text-gray-900 dark:text-white">
          Invalid reset link
        </h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          This password reset link is invalid or missing. Please request a new one.
        </p>
        <Link to="/forgot-password" className="text-sm font-medium text-primary-500 hover:text-primary-600">
          Request new reset link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post<{ message?: string }>('/auth/reset-password', { token, password });
      toast.success(res.data.message || 'Password reset successfully!');
      navigate('/login', { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to login
      </Link>
      <h1 className="mb-2 font-display text-3xl font-bold text-gray-900 dark:text-white">
        Set new password
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} />}
          error={errors.password}
          required
          minLength={8}
          autoFocus
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Type it again"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={18} />}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}
