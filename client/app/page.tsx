import Dashboard from "@/components/Dashboard";
import FileDashboard from "@/components/File";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <Dashboard />
      <FileDashboard/>
    </main>
  );
}
