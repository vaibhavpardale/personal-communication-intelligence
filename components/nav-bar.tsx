import Link from "next/link";

const LINKS = [
  { href: "/", label: "Attention" },
  { href: "/communications", label: "Communications" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-8 py-3 text-sm">
        <span className="font-medium">Personal Communication Intelligence</span>
        <div className="ml-auto flex gap-4">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
