import React from 'react'

// Provider y tema (no-op)
export function ChakraProvider({ children }) { return <>{children}</> }
export function extendTheme(obj) { return obj || {} }

// Utilidad simple para mapear algunas props comunes a estilos inline (opcional)
function styleFromProps(props = {}) {
  const style = { ...props.style }
  if (props.bg) style.background = props.bg
  if (props.height) style.height = props.height
  if (props.rounded) style.borderRadius = typeof props.rounded === 'string' ? props.rounded : '8px'
  if (props.border) style.border = props.border
  if (props.borderColor) style.borderColor = props.borderColor
  if (props.p) style.padding = typeof props.p === 'number' ? `${props.p * 4}px` : props.p
  if (props.pt) style.paddingTop = typeof props.pt === 'number' ? `${props.pt * 4}px` : props.pt
  if (props.pr) style.paddingRight = typeof props.pr === 'number' ? `${props.pr * 4}px` : props.pr
  if (props.pb) style.paddingBottom = typeof props.pb === 'number' ? `${props.pb * 4}px` : props.pb
  if (props.pl) style.paddingLeft = typeof props.pl === 'number' ? `${props.pl * 4}px` : props.pl
  if (props.m) style.margin = typeof props.m === 'number' ? `${props.m * 4}px` : props.m
  if (props.mt) style.marginTop = typeof props.mt === 'number' ? `${props.mt * 4}px` : props.mt
  if (props.mb) style.marginBottom = typeof props.mb === 'number' ? `${props.mb * 4}px` : props.mb
  if (props.color) style.color = props.color
  return style
}

function filterDomProps(props) {
  // Filtra props no estándar para evitar warnings en DOM
  const {
    bg, bgColor, rounded, border, borderColor, colorScheme, variant,
    columns, gap, justify, align, spacing,
    p, pt, pr, pb, pl, px, py, m, mt, mb, ml, mr, mx, my,
    fontSize, size,
    isDisabled,
    ...rest
  } = props
  return rest
}

export function Box(props) {
  const style = styleFromProps(props)
  const rest = filterDomProps(props)
  return <div {...rest} style={style}>{props.children}</div>
}

export function Flex(props) {
  const style = { display: 'flex', ...styleFromProps(props) }
  if (props.justify) style.justifyContent = props.justify
  if (props.align) style.alignItems = props.align
  const rest = filterDomProps(props)
  return <div {...rest} style={style}>{props.children}</div>
}

export function HStack(props) {
  const style = { display: 'flex', flexDirection: 'row', gap: props.spacing ? (typeof props.spacing === 'number' ? `${props.spacing * 4}px` : props.spacing) : '8px', ...styleFromProps(props) }
  if (props.justify) style.justifyContent = props.justify
  if (props.align) style.alignItems = props.align
  const rest = filterDomProps(props)
  return <div {...rest} style={style}>{props.children}</div>
}

export function VStack(props) {
  const style = { display: 'flex', flexDirection: 'column', gap: props.spacing ? (typeof props.spacing === 'number' ? `${props.spacing * 4}px` : props.spacing) : '8px', ...styleFromProps(props) }
  const rest = filterDomProps(props)
  return <div {...rest} style={style}>{props.children}</div>
}

export function SimpleGrid(props) {
  const cols = Array.isArray(props.columns) ? (props.columns[props.columns.length - 1] || 1) : (props.columns || 1)
  const style = { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: props.gap ? (typeof props.gap === 'number' ? `${props.gap * 4}px` : props.gap) : '8px', ...styleFromProps(props) }
  const rest = filterDomProps(props)
  return <div {...rest} style={style}>{props.children}</div>
}

export function Heading({ size, children, ...rest }) {
  const Tag = size === 'lg' ? 'h2' : size === 'md' ? 'h3' : 'h4'
  return <Tag {...filterDomProps(rest)}>{children}</Tag>
}

export function Text(props) {
  return <p {...filterDomProps(props)} style={styleFromProps(props)}>{props.children}</p>
}

export function Button({ isDisabled, type = 'button', children, ...rest }) {
  return <button type={type} disabled={!!isDisabled} {...filterDomProps(rest)}>{children}</button>
}

export function IconButton({ isDisabled, type = 'button', 'aria-label': ariaLabel, icon, children, ...rest }) {
  return <button type={type} aria-label={ariaLabel} disabled={!!isDisabled} {...filterDomProps(rest)}>{icon || children}</button>
}

export function Badge(props) {
  const style = { display: 'inline-block', padding: '2px 6px', borderRadius: '6px', background: '#eee', fontSize: '12px', ...styleFromProps(props) }
  return <span {...filterDomProps(props)} style={style}>{props.children}</span>
}

export const Input = React.forwardRef(function InputCmp({ isDisabled, ...rest }, ref) {
  return <input ref={ref} disabled={!!isDisabled} {...filterDomProps(rest)} />
})

// Tabla
export function Table(props) {
  const style = { width: '100%', borderCollapse: 'collapse', ...styleFromProps(props) }
  const rest = filterDomProps(props)
  return <table {...rest} style={style}>{props.children}</table>
}
export function Thead(props) { return <thead {...filterDomProps(props)}>{props.children}</thead> }
export function Tbody(props) { return <tbody {...filterDomProps(props)}>{props.children}</tbody> }
export function Tr(props) { return <tr {...filterDomProps(props)}>{props.children}</tr> }
export function Th({ isNumeric, style: s, ...rest }) {
  const style = { textAlign: isNumeric ? 'right' : 'left', ...(s || {}) }
  return <th {...filterDomProps(rest)} style={style}>{rest.children}</th>
}
export function Td({ isNumeric, style: s, ...rest }) {
  const style = { textAlign: isNumeric ? 'right' : 'left', ...(s || {}) }
  return <td {...filterDomProps(rest)} style={style}>{rest.children}</td>
}

// Tag
export function Tag(props) {
  const style = { display: 'inline-block', padding: '2px 8px', borderRadius: '10px', background: '#e6fffa', color: '#0f766e', fontSize: '12px', ...styleFromProps(props) }
  return <span {...filterDomProps(props)} style={style}>{props.children}</span>
}

// Select
export const Select = React.forwardRef(function SelectCmp({ isDisabled, placeholder, children, ...rest }, ref) {
  const other = filterDomProps(rest)
  return (
    <select ref={ref} disabled={!!isDisabled} {...other}>
      {placeholder ? <option value="" disabled>{placeholder}</option> : null}
      {children}
    </select>
  )
})

// Switch (simplificado)
export function Switch({ isChecked, onChange, isDisabled, ...rest }) {
  const checked = !!isChecked
  const other = filterDomProps(rest)
  const trackStyle = {
    width: 36,
    height: 20,
    background: checked ? '#3182ce' : '#ccc',
    borderRadius: 999,
    position: 'relative',
    transition: 'background .2s',
    display: 'inline-block'
  }
  const thumbStyle = {
    position: 'absolute',
    top: 2,
    left: checked ? 18 : 2,
    width: 16,
    height: 16,
    background: '#fff',
    borderRadius: '50%',
    transition: 'left .2s'
  }
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange && onChange({ target: { checked: e.target.checked } })}
        disabled={!!isDisabled}
        style={{ display: 'none' }}
        {...other}
      />
      <span style={trackStyle}>
        <span style={thumbStyle} />
      </span>
    </label>
  )
}
