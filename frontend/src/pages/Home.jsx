import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-soft to-white">
      <div className="max-w-4xl w-full kid-card flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left p-4">
          <h1 className="header-title">Number Buddies</h1>
          <p className="text-gray-600 mb-4">A friendly tool to screen and support children with math learning. Fun activities, adaptive checks, and clear reports.</p>
          <div className="flex gap-3 justify-center md:justify-start">
            <Link to="/assessment" className="px-5 py-3 rounded-xl bg-primary text-white font-semibold shadow">Start Assessment</Link>
            <Link to="/activities" className="px-5 py-3 rounded-xl border-2 border-primary text-primary font-semibold">Play Activities</Link>
          </div>
        </div>
        <div className="flex-1 p-4">
          <img src="/images/kids-illustration.png" alt="Kids illustration" className="w-full max-w-sm mx-auto rounded-xl" />
        </div>
      </div>
    </div>
  )
}
