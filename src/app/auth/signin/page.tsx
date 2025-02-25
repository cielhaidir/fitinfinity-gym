export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <p>Hello World! This is the sign in page.</p>
        
        {/* Anda bisa menambahkan form sign in di sini nanti */}
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Sign In
        </button>
      </div>
    </div>
  );
}

