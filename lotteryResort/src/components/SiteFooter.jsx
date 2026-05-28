export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4">
      <p className="text-center text-xs text-slate-400">
        본 사이트는 바이브 코딩으로 제작되었습니다. Vibe Coded by{' '}
        <a
          href="https://github.com/sejoon-papa/myRepo/tree/main/lotteryResort"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          shpark
        </a>
      </p>
    </footer>
  )
}
