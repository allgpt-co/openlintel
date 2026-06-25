import { describe, expect, it } from 'vitest';
import { formatCadConversionError, getCadPythonCommand } from './file-to-image';

describe('formatCadConversionError', () => {
  it('adds actionable setup guidance when DWG conversion dependencies are missing', () => {
    const error = new Error(
      "python3 failed: ERROR: Could not convert DWG file. Tried: dwg2dxf (-y): [Errno 2] No such file or directory: 'dwg2dxf'; odafc: No module named 'ezdxf'; ezdxf direct: No module named 'ezdxf'",
    );

    const message = formatCadConversionError(error, 'dwg');

    expect(message).toContain('DWG conversion requires');
    expect(message).toContain('dwg2dxf');
    expect(message).toContain('python3 -m pip install ezdxf matplotlib');
    expect(message).toContain('Original error: python3 failed');
  });
});

describe('getCadPythonCommand', () => {
  it('uses PYTHON_BIN when configured', () => {
    expect(getCadPythonCommand({ PYTHON_BIN: '/tmp/openlintel-python' })).toBe('/tmp/openlintel-python');
  });

  it('falls back to python3', () => {
    expect(getCadPythonCommand({})).toBe('python3');
  });
});
