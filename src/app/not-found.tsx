import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell mt-16">
      <h1 className="text-2xl font-semibold m-0">ไม่พบหน้านี้</h1>
      <p className="text-ink-2 mt-2">คู่หรือเซียนที่หาอาจยังไม่อยู่ในระบบ กลับไปที่ <Link href="/" className="underline underline-offset-4">หน้าแรก</Link></p>
    </main>
  );
}
