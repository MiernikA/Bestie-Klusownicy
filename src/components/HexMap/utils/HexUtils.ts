import type { CSSProperties } from "vue";

export const rows = 24;
export const cols = 36;
export const hexWidth = 42.5;
export const hexHeight = 37.2;

export const getRowsForColumn = (colIndex: number) => {
    const isOdd = colIndex % 2 !== 0;
    return isOdd ? rows - 1 : rows;
};

export const getColumnStyle = (colIndex: number):CSSProperties => {
    const isOdd = colIndex % 2 !== 0;
    return {
        display: "flex",
        flexDirection: "column",
        transform: isOdd ? `translateY(${hexHeight / 2}px)` : "translateY(0)",
        marginLeft: colIndex === 0 ? "0" : `-${hexWidth * 0.2415}px`,
        cursor: "pointer",
    };
};

export const getHexBaseStyle = () => ({
    width: `${hexWidth}px`,
    height: `${hexHeight}px`,
    clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    backgroundColor: "rgba(0,0,0,0.1)",
});

export const handleHexClick = (colIndex: number, rowIndex: number) => {
    console.log(`Hex clicked: col=${colIndex + 1}, row=${rowIndex}`);
};
