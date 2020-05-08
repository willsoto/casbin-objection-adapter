import { sum } from "../src";

describe("tests", () => {
  test("work", () => {
    const result = sum(2, 2);

    expect(result).toEqual(4);
  });
});
