import React from 'react'
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export const Dashboard = () => {
    const navigate = useNavigate();

    useEffect(()=>{
        const token = Cookies.get('access-token');
        if(!token){
         navigate('/');
        }
    }, []);


  return (
    <div className='text-white'>Dashboard</div>
  )
}
export default Dashboard;
