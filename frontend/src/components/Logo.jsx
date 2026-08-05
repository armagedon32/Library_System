function Logo({ size = 48, className = '', style = {}, alt = 'School Logo' }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', ...style }}
    />
  );
}

export default Logo;