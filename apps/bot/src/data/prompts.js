const assignmentRequirements = {
  default:
    'And check for common issues such as whether naming is good, the program structure is sound, and if there are any redundant codes, etc.',
  w0p2: 'Check if CSS selectors are correctly applied, whether appropriate html tags are used.',
  w0p3: 'If there is repetitive html writing, and focus on whether variables and class names are appropriately named. Ignore javascript, and note if sass is applied or suggest its application.',
  w1p1: 'Check if DOM manipulation causes frequent redrawing due to redundancy, whether Javascript is logically written, if variables are appropriately named (ignore class names), and whether ES6 syntax is properly used. Also, as this function intends to insert HTML with JS, no need to advise on this point.',
  w1p2: 'Check if ajax related technology is used for changing pages when clicking tabs or navigation, as it helps avoid page refresh and state loss. Also, focus on whether js functions are neatly segmented to reduce coupling.',
  w1p3: 'No need to suggest using advanced frameworks (such as React.js).',
  w1p4: 'This program is implementing infinite scrolling, please focus on whether the function segmentation is clean enough.',
  w1p5: 'Whether the segmentation of files and functions is sufficiently rational and clean',
  w2p1: 'Whether it adheres to React logic.',
  w2p2: 'Whether it adheres to React and styled-component logic, and if Component naming is reasonable. No need to consider Redux.',
  w2p3: 'Whether it adheres to React logic, and if React Hook usage is reasonable. No need to consider Redux',
  w2p4: 'Whether React Hook is appropriately used. Additionally, as this is an implementation of a shopping cart feature, focus on whether state operations are reasonable and if cookies or localStorage are used correctly.',
  w2p5: 'The program mainly implements the interface, so just give suggestions on layout design or variable naming.',
  w3p1: 'Focus on layout design, variable naming, and whether there are any bugs.',
  w3p2: 'Especially for this code implementing the form, please pay attention to the implementation status.',
  w3p3: 'Focus on the process of logging into Facebook and obtaining a token for the backend API.',
  w3p4: 'Focus on using tappay to submit credit card information for shopping verification.',
  w3p5: 'Focus on Google Analytics, SEO Consideration, Cross-Browser Testing.',
};

const lowerStandard =
  'Do not be too demanding; if there are no major issues, just offer encouragement.';

export const getPrompt = (diff, assignmentName, isExpired) => {
  return `You are a senior engineer conducting a code review for a subordinate. This is a diff from a GitHub pull request:

${diff}

Please focus on whether the program adheres to Best practices(ignore line breaks and indentation). ${
    assignmentRequirements[assignmentName]
  }

${
  isExpired
    ? lowerStandard
    : `Follow these rules:
- Start with this sentence pattern: 'Here are some suggestions...' By listing 1~5 key problems related to this program, just list the titles. Then, explain the content directly using code, written inside markdown backticks."
- End with this sentence pattern: 'You can go look up...' Include 1~5 technical keywords so your subordinates can have a direction to refer to.`
}`;
};
