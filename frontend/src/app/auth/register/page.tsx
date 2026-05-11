"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { register, clearError, selectAuthLoading, selectAuthError, selectIsAuthenticated } from "@/store/slices/authSlice";

interface FormState {
  first_name: string; last_name: string;
  username: string; email: string;
  password: string; confirm_password: string;
}

interface FieldErrors { [key: string]: string }

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required";
  if (!form.last_name.trim()) errors.last_name = "Last name is required";
  if (!form.username.trim()) errors.username = "Username is required";
  else if (form.username.length < 3) errors.username = "Username must be at least 3 characters";
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errors.username = "Only letters, numbers and underscores";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
  if (!form.password) errors.password = "Password is required";
  else if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Z]/.test(form.password)) errors.password = "Include at least one uppercase letter";
  else if (!/[0-9]/.test(form.password)) errors.password = "Include at least one number";
  if (form.password !== form.confirm_password) errors.confirm_password = "Passwords do not match";
  return errors;
}

function StrengthBar({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^a-zA-Z0-9]/.test(password), password.length >= 12].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["", "#ba1a1a", "#f97316", "#ffba20", "#19667d", "#166534"];
  return password ? (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i < score ? colors[score] : "#eceeef" }} />
        ))}
      </div>
      <p className="text-[10px]" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  ) : null;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthLoading);
  const serverError = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [form, setForm] = useState<FormState>({
    first_name: "", last_name: "", username: "", email: "", password: "", confirm_password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
    return () => { dispatch(clearError()); };
  }, [isAuthenticated, router, dispatch]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setTouched((p) => ({ ...p, [field]: true }));
    if (touched[field]) {
      const newErrors = validate({ ...form, [field]: e.target.value });
      setFieldErrors((p) => ({ ...p, [field]: newErrors[field] ?? "" }));
    }
  };

  const blur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setFieldErrors(validate(form));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (Object.keys(errors).length) return;
    dispatch(register({ username: form.username, email: form.email, password: form.password, password2: form.confirm_password, first_name: form.first_name, last_name: form.last_name }));
  };

  const F = ({ id, label, type = "text", placeholder, rightElement }: {
    id: keyof FormState; label: string; type?: string; placeholder: string; rightElement?: React.ReactNode;
  }) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type={type} value={form[id]} onChange={set(id)} onBlur={() => blur(id)}
          placeholder={placeholder} autoComplete={id}
          className={`w-full bg-[#eceeef] rounded-xl py-3 px-4 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#70787d] ${rightElement ? "pr-12" : ""} ${touched[id] && fieldErrors[id] ? "ring-2 ring-[#ba1a1a]/40 bg-[#ffdad6]/20" : "focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white"}`}
        />
        {rightElement && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {touched[id] && fieldErrors[id] && (
        <p className="text-[10px] text-[#ba1a1a] mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
          {fieldErrors[id]}
        </p>
      )}
      {id === "password" && <StrengthBar password={form.password} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffba20] to-[#513800] flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>wb_sunny</span>
          </div>
          <span className="font-headline font-bold text-[#191c1d]">SolarArchitect</span>
        </div>

        <h2 className="font-headline font-bold text-2xl text-[#191c1d] mb-1">Create your account</h2>
        <p className="text-sm text-[#40484c] mb-8">Join thousands of solar engineers worldwide</p>

        {serverError && (
          <div className="flex items-start gap-3 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl px-4 py-3 mb-6">
            <span className="material-symbols-outlined text-[#ba1a1a] flex-shrink-0" style={{ fontSize: 18 }}>error</span>
            <p className="text-sm text-[#ba1a1a]">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F id="first_name" label="First Name" placeholder="Alex" />
            <F id="last_name" label="Last Name" placeholder="Chen" />
          </div>
          <F id="username" label="Username" placeholder="alex.chen" />
          <F id="email" label="Email Address" type="email" placeholder="alex@heliostech.io" />
          <F id="password" label="Password" type={showPw ? "text" : "password"} placeholder="Min. 8 chars, 1 uppercase, 1 number"
            rightElement={
              <button type="button" onClick={() => setShowPw((p) => !p)} className="text-[#70787d] hover:text-[#40484c]">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPw ? "visibility_off" : "visibility"}</span>
              </button>
            }
          />
          <F id="confirm_password" label="Confirm Password" type={showPw ? "text" : "password"} placeholder="Repeat password" />

          <button type="submit" disabled={isLoading}
            className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating account…</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Create Account</>
            )}
          </button>
        </form>

        <p className="text-xs text-[#70787d] text-center mt-4">
          By creating an account you agree to our{" "}
          <Link href="#" className="text-[#19667d] font-medium">Terms of Service</Link>{" "}
          and{" "}
          <Link href="#" className="text-[#19667d] font-medium">Privacy Policy</Link>.
        </p>

        <p className="text-sm text-[#40484c] text-center mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-[#19667d] hover:opacity-75">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
