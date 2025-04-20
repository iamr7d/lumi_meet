// Handles showing filename and changing dropzone color on file select
document.addEventListener('DOMContentLoaded', function () {
  const resumeInput = document.getElementById('resume');
  const dropzoneLabel = resumeInput && resumeInput.closest('label');
  if (!resumeInput || !dropzoneLabel) return;

  // Add a span for filename display
  let fileNameSpan = dropzoneLabel.querySelector('.selected-filename');
  if (!fileNameSpan) {
    fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'selected-filename block mt-2 text-sm font-semibold text-green-700';
    dropzoneLabel.appendChild(fileNameSpan);
  }

  resumeInput.addEventListener('change', function () {
    if (resumeInput.files && resumeInput.files[0]) {
      // Show file name
      fileNameSpan.textContent = resumeInput.files[0].name;
      // Change dropzone color
      dropzoneLabel.classList.remove('bg-gray-50', 'hover:bg-gray-100', 'border-gray-300');
      dropzoneLabel.classList.add('bg-green-50', 'border-green-400');
    } else {
      // Reset
      fileNameSpan.textContent = '';
      dropzoneLabel.classList.remove('bg-green-50', 'border-green-400');
      dropzoneLabel.classList.add('bg-gray-50', 'hover:bg-gray-100', 'border-gray-300');
    }
  });
});
