class MoreMath {
    static isInRange(value, inclusiveMin, exclusiveMax) {
        return (inclusiveMin <= value) && (value < exclusiveMax);
    }
}

export { MoreMath };