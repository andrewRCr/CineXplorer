/** A tab's save ownership changes whenever its signed-in user changes. */
const changeCount = 0;
let toastSequence = 0;

export const getChangeCount = () => changeCount;
export const createSaveToastId = () =>
    `movie-save:${changeCount}:${++toastSequence}`;
