import React, { useContext } from 'react';
import { UserContext } from '../../context/Usercontext';
import Navbar from './Navbar'; // default import

const DashboardLayout = ({ children }) => {
  const { user, loading } = useContext(UserContext);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      {loading ? null : user && <div>{children}</div>}
    </div>
  );
};

export default DashboardLayout;
