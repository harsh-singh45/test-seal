"use client";
import React, { useState, useMemo } from 'react';
import { ClipboardCopyIcon } from 'lucide-react';

// Define the available operations for type safety
type Operation = 'encrypt' | 'decrypt' | 'sum' | 'subtract' | 'multiply';

export default function Dashboard() {
    const [operation, setOperation] = useState<Operation>('encrypt');
    const [input1, setInput1] = useState<string>('');
    const [input2, setInput2] = useState<string>('');
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [copyStatus, setCopyStatus] = useState<string>('');

    // Determine if the current operation requires only a single input field
    const isSingleInput = useMemo(() => {
        return ['encrypt', 'decrypt'].includes(operation);
    }, [operation]);

    // Handle the API call when the "Calculate" button is clicked
    const handleClick = async () => {
        setError(null);
        setResult(null);
        setLoading(true);
        setCopyStatus('');

        let body: any;
        let endpoint: string;

        // Construct the request body and API endpoint based on the selected operation
        switch (operation) {
            case 'encrypt':
                body = { value: Number(input1) };
                endpoint = '/encrypt';
                break;
            case 'decrypt':
                body = { ciphertext: input1 };
                endpoint = '/decrypt';
                break;
            case 'sum':
                body = { c1: input1, c2: input2 };
                endpoint = '/sum';
                break;
            case 'subtract':
                body = { c1: input1, c2: input2 };
                endpoint = '/subtract';
                break;
            case 'multiply':
                body = { c1: input1, c2: input2 };
                endpoint = '/multiply';
                break;
            default:
                setError('Invalid operation selected.');
                setLoading(false);
                return;
        }

        try {
            // The URL prefix is added here to match your FastAPI router
            const response = await fetch(`http://127.0.0.1:8000/he${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                // Dynamically extract the result based on the API's response structure
                const responseValue = data.ciphertext || data.sum_ciphertext || data.subtracted_ciphertext || data.multiplied_ciphertext || data.value;
                setResult(String(responseValue));
            } else {
                setError(data.detail || 'An unknown error occurred.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    // Handle the copy to clipboard functionality
    const handleCopy = async () => {
        if (result) {
            try {
                await navigator.clipboard.writeText(result);
                setCopyStatus('Copied!');
                // Reset the copied message after 2 seconds
                setTimeout(() => setCopyStatus(''), 2000);
            } catch (err) {
                console.error('Failed to copy using clipboard API:', err);
                // Fallback for browsers that don't support the Clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = result;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopyStatus('Copied!');
                setTimeout(() => setCopyStatus(''), 2000);
            }
        }
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-indigo-950 via-gray-950 to-purple-950 flex items-center justify-center p-4 text-white'>
            <div className='bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-xl space-y-8 border border-gray-700'>
                <h1 className='text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400'>
                    Homomorphic Encryption Dashboard
                </h1>

                <div className='space-y-4'>
                    <label htmlFor='operation' className='block text-lg font-medium text-gray-300'>
                        Select an Operation
                    </label>
                    <select
                        id='operation'
                        value={operation}
                        onChange={e => {
                            setOperation(e.target.value as Operation);
                            setInput1('');
                            setInput2('');
                            setResult(null);
                            setError(null);
                            setCopyStatus('');
                        }}
                        className='block w-full rounded-lg border border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 font-bold text-base p-3 bg-gray-700 text-white transition-colors duration-200'
                    >
                        <option value='encrypt'>Encrypt</option>
                        <option value='decrypt'>Decrypt</option>
                        <option value='sum'>Sum</option>
                        <option value='subtract'>Subtract</option>
                        <option value='multiply'>Multiply</option>
                    </select>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className={isSingleInput ? 'md:col-span-2' : ''}>
                        <label htmlFor='input1' className='block text-lg font-medium text-gray-300'>
                            {operation === 'decrypt' ? 'Input Ciphertext' : 'Input 1'}
                        </label>
                        <textarea
                            id='input1'
                            value={input1}
                            onChange={e => setInput1(e.target.value)}
                            className='mt-2 block w-full rounded-lg border border-blue-600 shadow-sm focus:border-purple-700 focus:ring-purple-500 text-base p-3 bg-gray-700 text-white font-semibold transition-colors duration-200 resize-none'
                            placeholder={
                                operation === 'encrypt'
                                    ? 'Enter a number...'
                                    : 'Enter ciphertext...'
                            }
                            rows={6}
                        />
                    </div>

                    {!isSingleInput && (
                        <div>
                            <label htmlFor='input2' className='block text-lg font-medium text-gray-300'>
                                Input 2
                            </label>
                            <textarea
                                id='input2'
                                value={input2}
                                onChange={e => setInput2(e.target.value)}
                                className='mt-2 block w-full rounded-lg shadow-sm border-2 border-blue-600 focus:border-purple-700 focus:ring-purple-500 text-base p-3 bg-gray-700 text-white font-semibold transition-colors duration-200 resize-none'
                                placeholder='Enter ciphertext...'
                                rows={6}
                            />
                        </div>
                    )}
                </div>

                <button
                    onClick={handleClick}
                    disabled={loading || (isSingleInput && !input1) || (!isSingleInput && (!input1 || !input2))}
                    className='w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600'
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        'Calculate'
                    )}
                </button>

                {error && (
                    <div className='p-4 bg-red-900 text-red-300 rounded-lg text-sm text-center font-medium'>
                        Error: {error}
                    </div>
                )}

                {result !== null && (
                    <div className='p-4 bg-gray-800 rounded-lg space-y-4'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-lg font-semibold text-gray-300'>Result</h3>
                            <div className='flex items-center space-x-2'>
                                {copyStatus && (
                                    <span className='text-xs text-green-400'>{copyStatus}</span>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className='p-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors duration-200'
                                    aria-label="Copy result"
                                >
                                    <ClipboardCopyIcon size={16} />
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={result}
                            readOnly
                            className='block w-full rounded-lg border border-gray-600 shadow-sm text-base p-3 bg-gray-700 text-purple-300 resize-none overflow-auto'
                            rows={6}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
