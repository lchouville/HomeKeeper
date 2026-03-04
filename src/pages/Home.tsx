import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";

function Home() {
  return (
    <div className="min-h-screen flex-row bg-slate-900">
      <Header page="dashboard"/>
      <h1 className="text-4xl font-bold text-white">
        Home
      </h1>
      <Footer/>
    </div>
  );
}

export default Home;