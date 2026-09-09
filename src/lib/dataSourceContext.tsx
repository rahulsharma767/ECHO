"use client";
import {createContext,useContext} from "react"; import type {EchoDataSource} from "@/types";
const Ctx=createContext<EchoDataSource|null>(null);
export function DataSourceProvider({source,children}:{source:EchoDataSource;children:React.ReactNode}){return <Ctx.Provider value={source}>{children}</Ctx.Provider>}
export function useEchoDataSource(){const source=useContext(Ctx);if(!source)throw new Error("EchoDataSource provider missing");return source}
