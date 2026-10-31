"""Optional asset preparation: python -m pip install 'fonttools[woff]==4.68.0'.

The current UI uses weights 400 through 900. Retain their variable interpolation,
all Unicode coverage, optical sizes, and Archivo widths while dropping unused
thin/extreme weights. Original font files and OFL licenses remain in public/fonts.
Builds use the committed outputs and do not require Python or fontTools.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

fonts = Path(__file__).resolve().parents[1] / 'public' / 'fonts'
for name in ('dm-sans', 'archivo'):
    source = fonts / f'{name}.woff2'
    target = fonts / f'{name}-ui.woff2'
    font = TTFont(source)
    coverage = font.getBestCmap()
    reduced = instantiateVariableFont(font, {'wght': (400, 900)}, inplace=False)
    assert reduced.getBestCmap() == coverage, 'Font character coverage changed'
    reduced.flavor = 'woff2'
    reduced.save(target)
    assert TTFont(target).getBestCmap() == coverage
    print(f'{source.name}: {source.stat().st_size} -> {target.stat().st_size} bytes')
