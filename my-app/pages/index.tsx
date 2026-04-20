import Head from 'next/head';
import HeroPage from '../components/HeroPage';

export default function Home() {
  return (
    <>
      <Head>
        <title>Udyoga Prep - AI-Powered Interview Prep</title>
        <meta name="description" content="Master your interview skills with AI-powered mock interviews." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <HeroPage />
    </>
  );
}
