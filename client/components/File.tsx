"use client"
import React, { useState } from 'react'
import { ClipboardCopyIcon, Upload } from 'lucide-react'

function FileDashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [copyStatus, setCopyStatus] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
      setCopyStatus('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)
    setCopyStatus('')

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http://127.0.0.1:8000/doc/extract-text", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data.extracted_text)
      } else {
        setError(data.detail || "An unknown error occurred.")
      }
    } catch (err) {
      setError("Failed to connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
        .then(() => setCopyStatus("Copied!"))
        .catch(() => setCopyStatus("Failed to copy."))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-purple-950 flex items-center justify-center p-6 text-white">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-2xl space-y-8 border border-gray-700">
        <h1 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Document Text Extractor
        </h1>

        <div className="space-y-4">
          <label className="block text-lg font-medium text-gray-300">
            Upload a document (.pdf, .docx, .txt)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg 
                       file:border-0 file:text-sm file:font-semibold 
                       file:bg-gradient-to-r file:from-indigo-500 file:to-purple-500 
                       file:text-white hover:file:from-indigo-600 hover:file:to-purple-600"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm 
                     text-lg font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 
                     hover:from-indigo-600 hover:to-purple-600 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                  5.291A7.962 7.962 0 014 12H0c0 3.042 
                  1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" /> Extract Text
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-red-900 text-red-300 rounded-lg text-sm text-center font-medium">
            Error: {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-800 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Extracted Text</h3>
            <div className="relative">
              <textarea
                value={result}
                readOnly
                className="block w-full rounded-lg border border-gray-600 shadow-sm text-base p-3 
                           bg-gray-700 text-purple-300 resize-y overflow-auto"
                rows={10}
              />
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 px-2 py-1 bg-gray-600 text-gray-200 text-xs font-medium 
                           rounded-md hover:bg-gray-500 transition-colors duration-200"
              >
                <ClipboardCopyIcon className="w-4 h-4" />
              </button>
              {copyStatus && <p className="mt-2 text-sm text-green-400">{copyStatus}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileDashboard
