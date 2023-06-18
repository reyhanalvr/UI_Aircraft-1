import { defaults, DragRotateAndZoom } from 'ol/interaction';

const dragRotateAndZoom = new DragRotateAndZoom();

const interactions = defaults()
    .extend([dragRotateAndZoom]);

export default interactions;