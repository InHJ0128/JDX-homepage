import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const isLikelyMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (window.matchMedia && window.matchMedia('(max-width: 820px)').matches);

function toMobile(pathname: string) {
  if (pathname === '/' || pathname === '') return '/m';
  if (pathname.startsWith('/works'))     return pathname.replace('/works', '/m/works');
  if (pathname.startsWith('/activity'))  return pathname.replace('/activity', '/m/activities');
  if (pathname.startsWith('/login'))     return '/m/login';
  if (pathname.startsWith('/logout'))    return '/m/logout';
  return '/m';
}
function toDesktop(pathname: string) {
  if (pathname.startsWith('/m/works'))      return pathname.replace('/m/works', '/works');
  if (pathname.startsWith('/m/activities')) return pathname.replace('/m/activities', '/activity');
  if (pathname.startsWith('/m/login'))      return '/login';
  if (pathname.startsWith('/m/logout'))     return '/logout';
  if (pathname.startsWith('/m'))            return '/';
  return pathname || '/';
}

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const onMobilePath = loc.pathname.startsWith('/m');
    const sp = new URLSearchParams(loc.search);
    const force = sp.get('view'); // ?view=desktop|mobile

    // 1) 쿼리파라미터가 있으면 1회 강제 (저장 X)
    if (force === 'mobile' && !onMobilePath) {
      nav(toMobile(loc.pathname), { replace: true });
      return;
    }
    if (force === 'desktop' && onMobilePath) {
      nav(toDesktop(loc.pathname), { replace: true });
      return;
    }

    // 2) 평시: 디바이스에 맞춰 자동
    if (isLikelyMobile() && !onMobilePath) {
      nav(toMobile(loc.pathname), { replace: true });
      return;
    }
    if (!isLikelyMobile() && onMobilePath) {
      nav(toDesktop(loc.pathname), { replace: true });
      return;
    }
  }, [loc.pathname, loc.search, nav]);

  return <>{children}</>;
}
