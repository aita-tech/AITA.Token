import { GlassmorphicNav } from "@/components/glassmorphic-nav"

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/images/gradient-background.jpg)",
        }}
      />

      {/* Glassmorphic Navigation Component */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <GlassmorphicNav />
      </div>
    </div>
  )
}
