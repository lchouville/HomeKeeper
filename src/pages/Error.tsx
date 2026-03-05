// ErrorP.tsx
import React from 'react';
import { Header } from '../components/ui/Header';
import { Footer } from '../components/ui/Footer';

interface ErrorPProps {
    code: number;
    message: string;
}

const ErrorP: React.FC<ErrorPProps> = ({ code, message }) => (
    <div className="min-h-screen flex flex-col bg-slate-900">
        <Header page=""  user={null} />
        <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-white text-4xl font-bold mb-4">{code}</h1>
            <p className="text-white text-lg">{message}</p>
        </div>
        <Footer/>
    </div>
);

export default ErrorP;