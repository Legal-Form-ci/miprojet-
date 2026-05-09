import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Users, Shield, CheckCircle, Newspaper } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-collaboration.jpg";

interface NewsItem {
  id: string;
  title: string;
}

export const Hero = () => {
  const { t } = useLanguage();
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from("news")
        .select("id, title")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (data) setLatestNews(data);
    };
    fetchNews();
  }, []);

  const highlights = [
    t('hero.highlight1'),
    t('hero.highlight2'),
    t('hero.highlight3'),
    t('hero.highlight4'),
  ];

  return (
    <section className="relative min-h-[88vh] lg:min-h-screen flex items-center pt-20 pb-12 overflow-hidden bg-hero">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-accent/15 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-primary-glow/25 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="container-luxe relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-w-0">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8 text-primary-foreground text-left reveal-up">
            {/* News Ticker */}
            {latestNews.length > 0 && (
              <div className="inline-flex flex-col gap-1.5 max-w-full bg-white/[0.06] backdrop-blur-md rounded-2xl p-4 border border-white/15 overflow-hidden shadow-luxe">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  <Newspaper className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  <span className="text-[11px] font-bold text-accent uppercase tracking-[0.18em]">Actualités en direct</span>
                </div>
                <div className="space-y-1">
                  {latestNews.map((n) => (
                    <Link key={n.id} to={`/news/${n.id}`} className="block text-sm text-white/90 hover:text-accent transition-colors truncate max-w-full">
                      → {n.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-4 min-w-0">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white/90 uppercase tracking-wider backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Plateforme Panafricaine · Multi-utilisateur
              </span>
              <h1 className="text-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Structurez,<br />
                <span className="gold-text">financez</span> et incubez
              </h1>
              <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-white/80 leading-snug max-w-2xl">
                vos projets en Afrique — accompagnement professionnel pour porteurs, investisseurs privés et bailleurs institutionnels.
              </h2>
            </div>

            <p className="text-base lg:text-lg text-white/75 leading-relaxed max-w-2xl">
              {t('hero.description')}
            </p>

            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
              {highlights.map((item, index) => (
                <div key={index} className="flex items-center gap-2.5 text-white/90">
                  <span className="grid place-items-center h-6 w-6 rounded-full bg-accent/20 ring-1 ring-accent/40 flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <span className="text-sm sm:text-base">{item}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 py-5 border-t border-b border-white/15">
              {[
                { icon: TrendingUp, value: '105+', label: t('hero.projectsStructured') },
                { icon: Users, value: '65+', label: t('hero.activeMembers') },
                { icon: Shield, value: '5', label: t('hero.countriesCovered') },
              ].map((s, i) => (
                <div key={i} className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                    <span className="text-display text-2xl sm:text-3xl md:text-4xl text-white">{s.value}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/70">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0 pt-2">
              <Link to="/submit-project" className="w-full sm:w-auto">
                <Button size="lg" className="group w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-luxe relative overflow-hidden">
                  <span className="relative z-10 truncate">{t('hero.submitProject')}</span>
                  <ArrowRight className="ml-2 h-5 w-5 flex-shrink-0 relative z-10 transition-transform group-hover:translate-x-1" />
                  <span className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <Link to="/projects" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full bg-white/5 border-white/25 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-md"
                >
                  {t('hero.discoverProjects')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="lg:col-span-5 relative hidden lg:flex justify-center reveal-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-3xl overflow-hidden shadow-luxe ring-1 ring-white/10">
              <img
                src={heroImage}
                alt="Entrepreneurs africains collaborant sur MIPROJET"
                className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-2xl shadow-luxe ring-1 ring-border animate-float">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('hero.qualityLabel')}</p>
              <p className="text-display text-3xl text-primary mt-1">Score A</p>
            </div>
            <div className="absolute -top-6 -right-6 bg-card p-4 rounded-2xl shadow-luxe ring-1 ring-border animate-float" style={{ animationDelay: '1.5s' }}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('hero.projectsAccompanied')}</p>
              <p className="text-display text-2xl gold-text mt-1">1,2 Mds FCFA</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
