import React, { useState } from 'react';
import { Header } from '../components/ui/Header';
import { Footer } from '../components/ui/Footer';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';

interface ErrorPProps {
    code: number;
    message: string;
    showHomeButton?: boolean; // Option pour afficher un bouton "Retour à l'accueil"
}

const errorMessages: Record<number, string> = {
    404: 'Page non trouvée',
    403: 'Accès interdit',
    500: 'Erreur interne du serveur',
    401: 'Non autorisé (veuillez vous connecter)',
};

const ErrorP: React.FC<ErrorPProps> = ({
    code,
    message,
    showHomeButton = true,
}) => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
        
    // Utiliser le message par défaut si aucun message personnalisé n'est fourni
    const displayMessage = message || errorMessages[code] || 'Une erreur est survenue';

    // Styles dynamiques en fonction du code d'erreur
    const getErrorStyle = () => {
        switch (code) {
            case 404:
                return 'text-blue-400';
            case 403:
            case 401:
                return 'text-yellow-400';
            case 500:
                return 'text-red-400';
            default:
                return 'text-white';
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-900)]">
            <Header 
                page="Error" 
                user={null} 
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            <main className="flex flex-1 overflow-hidden">
            <Sidebar
                      sidebarOpen={sidebarOpen}
                      setSidebarOpen={setSidebarOpen}
                    />
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                {/* Code d'erreur */}
                <h1 className={`text-6xl font-bold mb-4 ${getErrorStyle()}`}>
                {code}
                </h1>

                {/* Message d'erreur */}
                <p className="text-white text-lg mb-6 max-w-md">
                {displayMessage}
                </p>

                {/* Boutons d'action */}
                <div className="flex gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                    Retour
                </button>
                {showHomeButton && (
                    <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
                    >
                    Retour à l'accueil
                    </button>
                )}
                </div>

                {/* Illustration optionnelle (ex: image 404) */}
                {code === 404 && (
                <div className="mt-8">
                    <img
                    src="https://via.placeholder.com/300x200/3a4a5a/ffffff?text=404+Not+Found"
                    alt="Page non trouvée"
                    className="max-w-xs opacity-80"
                    />
                </div>
                )}
            </div>
                
            </main>
            <Footer />
        </div>
    );
};

export default ErrorP;
