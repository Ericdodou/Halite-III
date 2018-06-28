import * as PIXI from "pixi.js";

import * as assets from "./assets";
import {PLAYER_COLORS} from "./assets";

/**
 * Manages a Map on screen.
 */
export class Map {
    /**
     * @param constants The constants object from the replay.
     * @param scale The scale factor the visualizer is using.
     * @param onSelect The callback for when this planet is selected.
     */
    constructor(replay, constants, scale, onSelect, renderer) {
        this.container = null;
        this.ownershipOverlay = null;
        this.scale = scale;
        this.constants = constants;
        this.prev_time = 0;
        this.renderer = renderer;


        // Background image, based on initial production values
        // draw a map, with color intensity dependent on production value
        // todo: get rows/cols from replay file
        this.rows = replay.production_map.height;
        this.cols = replay.production_map.width;
        let mapGraphics = new PIXI.Graphics();
        // TODO: get this info dynamically from replay file
        this.productions = new Array(this.rows);
        //this.owners = new Array(this.rows);
        for (let row = 0; row < this.rows; row++) {
            this.productions[row] = new Array(this.cols);
            //this.owners[row] = new Array(this.cols);
            for (let col = 0; col < this.cols; col++) {
                let cell = replay.production_map.grid[row][col];
                this.productions[row][col] = cell["type"] === "n" ? cell.production : 0;
                //this.owners[row][col] = row + col > assets.REPLAY_WIDTH ? {owner: 0} : {owner: 1};
            }
        }

        let baseMapTexture = this.generateMapTexture(this.rows, this.cols, this.productions, this.productionToColor,
            true, this.renderer, assets.MAP_ALPHA, this.scale, this.constants);

        this.baseMap = new PIXI.Sprite(baseMapTexture);

        this.baseMap.interactive = true;

        this.baseMap.on("pointerdown", (e) => {
            const localCoords = e.data.global;
            const relativeX = localCoords.x;
            const relativeY = localCoords.y;
            const coordX = (relativeX / assets.VISUALIZER_SIZE) * replay.production_map.width;
            const coordY = (relativeY / assets.VISUALIZER_HEIGHT) * replay.production_map.height;
            const cellX = Math.floor(coordX);
            const cellY = Math.floor(coordY);
            const production = this.productions[cellY][cellX];
            onSelect("point", { x: cellX, y: cellY, production: production,
                owner: 0}); //this.owners[cellX][cellY].owner});
        });
    }

    /**
     * Determines the color of a map square based on the production of said square
     * @param productions: an array containing the production value of each cell
     * @param row: the row of the cell of interest
     * @param col: the column of the cell of interest
     * Returns a color, alpha pair. Darker = more production
     */
    productionToColor(productions, row, col, MAX_PRODUCTION) {
        const production = productions[row][col];
        if (production === 0) {
            // TODO: determine best base color for factories
            return 0x000000;
        }
        let production_fraction = production / MAX_PRODUCTION;
        if (production_fraction < 0.33) {
            return [assets.MAP_COLOR_LIGHT, (production_fraction / 0.33)];
        }
        else if (production_fraction < 0.66) {
            return [assets.MAP_COLOR_MEDIUM, (production_fraction - 0.33) / 0.33];
        }
        else {
            return [assets.MAP_COLOR_DARK, (production_fraction - 0.66) / 0.34];
        }
    }
    /**
     * Generate a map texture to be used as a sprite
     * Can be used to draw both the base production map and any ownership tinting
     */
    generateMapTexture(rows, cols, mapArray, squareToColor, drawLines, renderer, alpha, scale, constants) {
        let mapGraphics = new PIXI.Graphics();
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let color_arr = squareToColor(mapArray, row, col, constants.MAX_CELL_PRODUCTION);
                mapGraphics.beginFill(color_arr[0], color_arr[1]);
                mapGraphics.drawRect(col * scale, row * scale, scale, scale);

                mapGraphics.endFill();
            }
        }
        if (drawLines) {
            mapGraphics.lineStyle(assets.LINE_WIDTH, assets.LINE_COLOR);
            //Draw the map lines
            for (let row = 0; row <= rows + 2; row++) {
                // move to start of row, draw line
                // TODO: why are there 2 more columns and rows than I expect?
                mapGraphics.moveTo(0, row * scale);
                mapGraphics.lineTo((cols + 2) * scale,
                    row * scale);
            }

            for (let col = 0; col <= cols + 2; col++) {
                // move to start of col, draw line
                mapGraphics.moveTo(col * scale, 0);
                mapGraphics.lineTo(col * scale,
                    (rows + 2) * scale);
            }
        }

        return renderer.generateTexture(mapGraphics);
    }

    /**
     * Add this factory to the PIXI stage.
     * @param container {PIXI.Container} The parent container of the fish
     * sprites.
     */
    attach(container) {
        container.addChild(this.baseMap);
        this.container = container;
    }

    /**
     * Remove the map from the visualizer.
     */
    destroy() {
        this.container.removeChild(this.baseMap);
    }

    get id() {
        // TODO: do maps get IDs?
        return 0;
    }

    /**
     * Return the color of the owner of a cell
     * @param owners: 2d array of the map, containing owner information
     *  Info can be expanded, eg for obstacles
     * @params row, col: row and column of cell of interest
     * returns a color in hex
     */
    ownerToColor(owners, row, col) {
        const cell = owners[row][col];
        return PLAYER_COLORS[cell.owner];

    }
    /**
     * Update the fish display based on the current frame and time.
     * @param dt
     */
    update(mapRecord) {
        // TODO: update dynamically from record

        let newTintTexture = this.generateMapTexture(this.rows, this.cols,
            this.owners, this.ownerToColor, false, this.renderer,
            assets.OWNER_TINT_ALPHA, this.scale);
        this.newTintMap = new PIXI.Sprite(newTintTexture);

        this.newTintMap.width = assets.VISUALIZER_SIZE;
        this.newTintMap.height = assets.VISUALIZER_HEIGHT;

        this.newTintMap.interactive = false;

        // add the tint to the map
        // TODO: investigate if this is a reasonable way to do this
        this.container.addChild(this.newTintMap);
        if (typeof this.oldTintMap !== 'undefined') {
            this.container.removeChild(this.oldTintMap);
        }
        this.oldTintMap = this.newTintMap;
    }
}