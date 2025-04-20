// Handles form submission and uploads data to the backend

document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form');
  const nameInput = document.getElementById('name');
  const collegeInput = document.getElementById('college');
  const jobdescInput = document.getElementById('jobdesc');
  const resumeInput = document.getElementById('resume');
  const startBtnText = document.getElementById('startBtnText');
  const startBtnIcon = document.getElementById('startBtnIcon');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate
    if (!nameInput.value || !collegeInput.value || !resumeInput.files[0]) {
      alert('Please fill all fields and upload your resume.');
      return;
    }

    // UI feedback
    startBtnText.textContent = 'Uploading...';
    startBtnIcon.innerHTML = '<svg class="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>';

    const formData = new FormData();
    formData.append('name', nameInput.value);
    formData.append('college', collegeInput.value);
    formData.append('jobdesc', jobdescInput.value);
    formData.append('resume', resumeInput.files[0]);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        // Animate gradient as before
        const startBtn = document.getElementById('startBtn');
        startBtn.classList.remove('bg-blue-600','hover:bg-blue-700');
        startBtn.classList.add('bg-gradient-to-r','from-blue-500','via-fuchsia-500','to-emerald-400','animate-gradient-x');
        startBtnText.textContent = 'Generating Interview';
        startBtnIcon.innerHTML = '<svg class="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>';
        startBtn.disabled = true;
        startBtn.classList.add('opacity-80','cursor-not-allowed');
        setTimeout(function() { window.location.href = 'interview.html'; }, 800);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      startBtnText.textContent = 'Error!';
      startBtnIcon.innerHTML = '';
      // No alert dialog, just show error on button
    }
  });
});
