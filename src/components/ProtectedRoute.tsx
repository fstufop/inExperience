import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import Loading from './Loading';

interface ProtectedRouteProps {
    redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectPath = '/admin/login' }) => {
    const [user, loading] = useAuthState(auth);

    if (loading) {
        return <Loading message="Verificando autenticação..." size="medium" />;
    }

    if (!user) {
        return <Navigate to={redirectPath} replace />;
    }

    return (
        <div>
            <Outlet />
        </div>
    );
};

export default ProtectedRoute;