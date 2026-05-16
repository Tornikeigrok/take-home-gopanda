import { useState, useEffect } from 'react'
import './App.css'

function App() {

  
  return (
    <>
       <header className='w-11/12 mx-auto p-2  mt-2  '>
        <nav className='flex justify-between items-center'>
          <h2 className='text-black text-[15px] md:text-[22px] font-bold'>MeetMe</h2>
          <ul className='flex gap-3 items-center text-xs md:text-base'>
            <li>About</li>
            <li>Preview</li>
          </ul>
          <div>
            <button className='text-sm md:text-base border border-black hover:cursor-pointer hover:bg-black hover:text-white transition-all duration-200 rounded-full p-2 w-[80px]'>Log in</button>
          </div>
        </nav>
       </header>

       <section className='w-11/12 mx-auto mt-10'>
       <div className='mx-auto flex flex-col gap-5 justify-center items-center'>
        <h1 className='text-sm md:text-4xl font-bold'>Room Scheduling System</h1>
        <p className='text-center'>A room scheduling system that allows you to schedule a room for a specific purpose</p>
           <button className='text-sm md:text-base 
           border border-black hover:cursor-pointer 
           hover:bg-black hover:text-white transition-all duration-200 
           rounded-full p-2 w-[80px]'>Try it</button>
       </div>
       </section>
    </>
  )
}

export default App
