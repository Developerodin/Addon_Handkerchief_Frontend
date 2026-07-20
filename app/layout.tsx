
"use client"
import "./globals.scss";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import {   useState } from "react";
import { Initialload } from "@/shared/contextapi";
import AuthProvider from "@/shared/providers/AuthProvider";


const RootLayout = ({children}:any) =>{
  const [pageloading , setpageloading] = useState(false)
    return(
      <html lang="en">
        <body>
          <Provider store={store}>
            <AuthProvider>
            <Initialload.Provider value={{ pageloading , setpageloading }}>
              {children}
            </Initialload.Provider>
            </AuthProvider>
          </Provider>
          <PrelineScript/>
        </body>
      </html>
    )
  }
  export default RootLayout
