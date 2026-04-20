export function Ok(value) {
    return { ok: true, value };
}
export function Err(error) {
    return { ok: false, error };
}
export function isOk(result) {
    return result.ok === true;
}
export function isErr(result) {
    return result.ok === false;
}
//# sourceMappingURL=result.js.map