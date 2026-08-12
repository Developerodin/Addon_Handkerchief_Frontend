"use client"
import React, { useEffect } from 'react'

const Seo = ({ title }:any) => {
  useEffect(() => {
    document.title = `Addon Handkerchief - ${title}`
  }, [])
  
  return (
    <>
    </>
  )
}

export default Seo;