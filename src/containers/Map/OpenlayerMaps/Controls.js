import { defaults, Attribution, FullScreen, ScaleLine, ZoomSlider, OverviewMap, MousePosition } from 'ol/control';

const attribution = new Attribution({
    collapsible: true,
    collapsed: true,
});

const fullScreen = new FullScreen();

const scaleLine = new ScaleLine({
    units: 'metric',
    bar: true,
    steps: 4,
    text: false,
    minWidth: 160,
});

const zoomSlider = new ZoomSlider();

const overviewMap = new OverviewMap();

const mousePosition = new MousePosition();

const controls = defaults({ attribution: false })
    .extend([attribution, fullScreen, scaleLine, zoomSlider, overviewMap, mousePosition]);

export default controls;
