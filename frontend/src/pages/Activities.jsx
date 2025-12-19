export default function Activities(){
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full kid-card">
        <h2 className="text-2xl font-bold mb-2">Activities</h2>
        <p className="text-gray-600 mb-4">Playful exercises to strengthen number sense and arithmetic fluency.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-soft rounded-xl text-center">Matching Numbers</div>
          <div className="p-4 bg-soft rounded-xl text-center">Quick Count</div>
          <div className="p-4 bg-soft rounded-xl text-center">Shape Puzzles</div>
        </div>
      </div>
    </div>
  )
}
