// utils/academicPeriod.js
export function getAcademicPeriod(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();

  let semester = "Holiday";
  if (month >= 9 && month <= 12) semester = "Semester 1";
  else if (month >= 1 && month <= 5) semester = "Semester 2";

  // Academic year label: Sep–Dec belongs to {year}/{year+1},
  // Jan–May belongs to {year-1}/{year}
  let startYear, endYear;
  if (month >= 9) {
    startYear = year;
    endYear = year + 1;
  } else if (month <= 5) {
    startYear = year - 1;
    endYear = year;
  } else {
    // Jun–Aug: still show the upcoming or just-ended academic year
    startYear = year;
    endYear = year + 1;
  }

  const short = (y) => String(y).slice(-2);

  return {
    year: `${startYear}/${short(endYear)}`,
    semester,
    label: `${startYear}/${short(endYear)} · ${semester}`,
  };
}
