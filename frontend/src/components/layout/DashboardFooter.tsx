// A minimal developer credit for the back-office (admin/staff) screens —
// same credit as the public site's Footer.tsx, but a single slim line
// matching this area's plain admin-UI styling instead of the public
// site's branded footer.
function DashboardFooter() {
  return (
    <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
      Developed by{' '}
      <a
        href="https://digitalwebweaver.com"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        Digital Web Weaver
      </a>{' '}
      — Software Development Company
    </footer>
  );
}

export default DashboardFooter;
