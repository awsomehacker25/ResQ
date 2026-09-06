import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>ResQ</h1>
      <p>QR code with your emergency info. Scan it, see allergies/contacts, call through masked number.</p>
      <p><Link href="/dashboard">Dashboard</Link></p>
      <p><Link href="/r/jk4m2xq9">Demo profile</Link></p>
      <p><Link href="/responders/apply">Register as a responder org</Link></p>
    </div>
  );
}
