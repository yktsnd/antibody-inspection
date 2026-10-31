"""Rasterize the repository's simple M/L/H/V antibody mark for VS Code Marketplace."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
svg=ET.parse(root/'media/antibody.svg').getroot()
size=1024
image=Image.new('RGB',(size,size),'#101b2c')
draw=ImageDraw.Draw(image)
scale=32;offset=128;width=46
for path in svg.iter('{http://www.w3.org/2000/svg}path'):
    tokens=re.findall(r'[MLHV]|-?\d+(?:\.\d+)?',path.attrib['d']);i=0;point=(0.,0.)
    while i<len(tokens):
        command=tokens[i];i+=1
        if command in ['M','L']:next_point=(float(tokens[i]),float(tokens[i+1]));i+=2
        elif command=='H':next_point=(float(tokens[i]),point[1]);i+=1
        elif command=='V':next_point=(point[0],float(tokens[i]));i+=1
        else:raise ValueError('Unsupported SVG command')
        target=tuple(offset+v*scale for v in next_point)
        if command!='M':
            start=tuple(offset+v*scale for v in point);draw.line([start,target],fill='#67dbcb',width=width)
            for x,y in [start,target]:draw.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill='#67dbcb')
        point=next_point
image.resize((256,256),Image.Resampling.LANCZOS).save(root/'media/icon.png')
