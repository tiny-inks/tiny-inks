import { notFound } from 'next/navigation';

/* Any unknown URL under /en or /ar renders the designed 404 (no dead ends)
   instead of the framework default. */
export default function CatchAll() {
  notFound();
}
