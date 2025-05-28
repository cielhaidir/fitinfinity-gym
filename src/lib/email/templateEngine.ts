type TemplateData = Record<string, any>;

export function renderTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    
    if (value === undefined) {
      console.warn(`Template variable "${trimmedKey}" not found in provided data`);
      return match;
    }
    
    return String(value);
  });
}

// Example of how template variables work:
// Template: "Hello {{name}}, welcome to {{company}}!"
// Data: { name: "John", company: "Acme Corp" }
// Result: "Hello John, welcome to Acme Corp!"