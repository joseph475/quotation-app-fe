import { h } from 'preact';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer class="bg-white border-t border-gray-200 py-4">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="text-sm text-gray-500">
            &copy; {currentYear} Ordering App. All rights reserved.
          </div>
          <div class="mt-2 md:mt-0 flex space-x-4">
            <a href="/terms" class="text-sm text-gray-500 hover:text-gray-700">Terms of Service</a>
            <a href="/privacy" class="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</a>
            <a href="/contact" class="text-sm text-gray-500 hover:text-gray-700">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
