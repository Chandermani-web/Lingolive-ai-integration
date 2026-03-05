"""
Main example script for Speech-to-Speech Translation System
Demonstrates various usage patterns and features
"""
import logging
import sys
from pathlib import Path
import argparse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('speech_translation.log')
    ]
)

logger = logging.getLogger(__name__)

# Import pipeline modules
from ai.speech_pipeline import SpeechToSpeechPipeline, translate_speech
from ai.asr_module import ASRModule, transcribe_audio
from ai.translation_module import TranslationModule, translate_text
from ai.tts_module import TTSModule, text_to_speech
from ai.config import SUPPORTED_LANGUAGES


def example_1_basic_usage():
    """Example 1: Basic speech-to-speech translation"""
    print("\n" + "=" * 80)
    print("Example 1: Basic Speech-to-Speech Translation")
    print("=" * 80)
    
    # Quick one-liner usage
    translate_speech(
        input_audio="input_audio.wav",
        output_audio="output_translated.wav",
        source_language="english",
        target_language="hindi"
    )
    
    print("✓ Translation completed: output_translated.wav")


def example_2_detailed_usage():
    """Example 2: Detailed usage with intermediate results"""
    print("\n" + "=" * 80)
    print("Example 2: Detailed Translation with Intermediate Results")
    print("=" * 80)
    
    # Initialize pipeline
    pipeline = SpeechToSpeechPipeline(
        source_language="english",
        target_language="tamil"
    )
    
    # Process with intermediate results
    result = pipeline.process(
        input_audio="input_audio.wav",
        output_path="output_tamil.wav",
        return_intermediate=True
    )
    
    # Print intermediate results
    print(f"\nOriginal transcription: {result['transcription']}")
    print(f"Translation: {result['translation']}")
    print(f"\nTimings:")
    print(f"  ASR: {result['timings']['asr']:.2f}s")
    print(f"  Translation: {result['timings']['translation']:.2f}s")
    print(f"  TTS: {result['timings']['tts']:.2f}s")
    print(f"  Total: {result['timings']['total']:.2f}s")


def example_3_batch_processing():
    """Example 3: Batch processing multiple files"""
    print("\n" + "=" * 80)
    print("Example 3: Batch Processing")
    print("=" * 80)
    
    # Initialize pipeline
    pipeline = SpeechToSpeechPipeline(
        source_language="hindi",
        target_language="english"
    )
    
    # List of input files
    input_files = [
        "audio1.wav",
        "audio2.wav",
        "audio3.wav",
    ]
    
    # Process batch
    results = pipeline.process_batch(
        input_files=input_files,
        output_dir="translated_output",
        batch_size=1
    )
    
    # Print results
    for i, result in enumerate(results, 1):
        if result['success']:
            print(f"\n{i}. {result['input_file']}")
            print(f"   Transcription: {result['transcription']}")
            print(f"   Translation: {result['translation']}")
            print(f"   Output: {result['output_file']}")
        else:
            print(f"\n{i}. {result['input_file']} - FAILED: {result['error']}")
    
    # Print performance stats
    pipeline.print_performance_stats()


def example_4_individual_modules():
    """Example 4: Using individual modules separately"""
    print("\n" + "=" * 80)
    print("Example 4: Using Individual Modules")
    print("=" * 80)
    
    # 1. ASR Module - Speech to Text
    print("\n--- ASR Module ---")
    asr = ASRModule()
    transcription = transcribe_audio("input_audio.wav", language="en")
    print(f"Transcription: {transcription}")
    
    # 2. Translation Module - Text to Text
    print("\n--- Translation Module ---")
    translator = TranslationModule()
    translation = translate_text(
        text=transcription,
        source_lang="english",
        target_lang="bengali"
    )
    print(f"Translation: {translation}")
    
    # 3. TTS Module - Text to Speech
    print("\n--- TTS Module ---")
    tts = TTSModule()
    output_path = text_to_speech(
        text=translation,
        output_path="output_bengali.wav",
        language="bengali"
    )
    print(f"Audio saved to: {output_path}")


def example_5_multiple_languages():
    """Example 5: Translate to multiple target languages"""
    print("\n" + "=" * 80)
    print("Example 5: Translate to Multiple Languages")
    print("=" * 80)
    
    input_audio = "input_english.wav"
    target_languages = ["hindi", "tamil", "bengali", "telugu", "gujarati"]
    
    for target_lang in target_languages:
        print(f"\nTranslating to {target_lang.title()}...")
        
        pipeline = SpeechToSpeechPipeline(
            source_language="english",
            target_language=target_lang
        )
        
        output_file = f"output_{target_lang}.wav"
        result = pipeline.process(
            input_audio=input_audio,
            output_path=output_file,
            return_intermediate=True
        )
        
        print(f"  Translation: {result['translation']}")
        print(f"  Saved to: {output_file}")
        print(f"  Time: {result['timings']['total']:.2f}s")


def example_6_system_info():
    """Example 6: Display system and model information"""
    print("\n" + "=" * 80)
    print("Example 6: System Information")
    print("=" * 80)
    
    pipeline = SpeechToSpeechPipeline()
    
    info = pipeline.get_system_info()
    
    print("\nSystem Configuration:")
    print(f"  Device: {info['device']}")
    print(f"  Data Type: {info['dtype']}")
    print(f"  GPU Available: {info['gpu_available']}")
    
    print("\nASR Module:")
    asr_info = info['asr_info']
    print(f"  Model: Whisper {asr_info['model_size']}")
    print(f"  Device: {asr_info['device']}")
    
    print("\nTranslation Module:")
    trans_info = info['translation_info']
    if trans_info:
        print(f"  Model: IndicTrans2")
        print(f"  Supported Languages: {trans_info['supported_languages']}")
        print(f"  Both Directions: {trans_info['both_directions']}")
    
    print("\nTTS Module:")
    tts_info = info['tts_info']
    print(f"  Model: {tts_info['model_name']}")
    print(f"  Sample Rate: {tts_info['sample_rate']} Hz")
    
    print(f"\nSupported Languages ({len(SUPPORTED_LANGUAGES)}):")
    for lang in sorted(SUPPORTED_LANGUAGES.keys()):
        print(f"  - {lang.title()}")


def example_7_error_handling():
    """Example 7: Proper error handling"""
    print("\n" + "=" * 80)
    print("Example 7: Error Handling")
    print("=" * 80)
    
    try:
        pipeline = SpeechToSpeechPipeline(
            source_language="english",
            target_language="hindi"
        )
        
        result = pipeline.process(
            input_audio="input_audio.wav",
            output_path="output.wav",
            return_intermediate=True
        )
        
        print("✓ Translation successful")
        print(f"  Transcription: {result['transcription']}")
        print(f"  Translation: {result['translation']}")
        
    except FileNotFoundError as e:
        logger.error(f"Input file not found: {e}")
        print("✗ Error: Input audio file not found")
        
    except ValueError as e:
        logger.error(f"Invalid parameter: {e}")
        print(f"✗ Error: {e}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"✗ Unexpected error: {e}")


def example_8_custom_configuration():
    """Example 8: Custom model configuration"""
    print("\n" + "=" * 80)
    print("Example 8: Custom Configuration")
    print("=" * 80)
    
    from ai.config import config
    
    # Display current configuration
    print("\nCurrent Configuration:")
    print(f"  Whisper Model: {config.whisper_model_size}")
    print(f"  Audio Sample Rate: {config.audio_sample_rate} Hz")
    print(f"  Audio Chunk Size: {config.audio_chunk_size}")
    print(f"  Device: {config.device}")
    print(f"  Data Type: {config.dtype}")
    
    # You can modify configuration before initializing pipeline
    # config.whisper_model_size = "medium"  # For better accuracy
    # config.audio_chunk_duration = 5.0  # Longer chunks


def cli_interface():
    """Command-line interface for the translation system"""
    parser = argparse.ArgumentParser(
        description="Real-time Multilingual Speech-to-Speech Translation System"
    )
    
    parser.add_argument(
        "input",
        type=str,
        help="Input audio file path"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="output_translated.wav",
        help="Output audio file path (default: output_translated.wav)"
    )
    
    parser.add_argument(
        "-s", "--source",
        type=str,
        default="english",
        choices=list(SUPPORTED_LANGUAGES.keys()),
        help="Source language (default: english)"
    )
    
    parser.add_argument(
        "-t", "--target",
        type=str,
        default="hindi",
        choices=list(SUPPORTED_LANGUAGES.keys()),
        help="Target language (default: hindi)"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show intermediate results"
    )
    
    parser.add_argument(
        "--list-languages",
        action="store_true",
        help="List all supported languages"
    )
    
    args = parser.parse_args()
    
    # List languages
    if args.list_languages:
        print("Supported Languages:")
        for lang in sorted(SUPPORTED_LANGUAGES.keys()):
            print(f"  - {lang}")
        return
    
    # Check if input file exists
    if not Path(args.input).exists():
        print(f"Error: Input file '{args.input}' not found")
        return
    
    print("=" * 60)
    print("Speech-to-Speech Translation")
    print("=" * 60)
    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print(f"Source: {args.source}")
    print(f"Target: {args.target}")
    print("=" * 60)
    
    # Initialize pipeline
    pipeline = SpeechToSpeechPipeline(
        source_language=args.source,
        target_language=args.target
    )
    
    # Process
    result = pipeline.process(
        input_audio=args.input,
        output_path=args.output,
        return_intermediate=args.verbose
    )
    
    if args.verbose:
        print("\nResults:")
        print(f"  Transcription: {result['transcription']}")
        print(f"  Translation: {result['translation']}")
        print(f"\nTimings:")
        print(f"  ASR: {result['timings']['asr']:.2f}s")
        print(f"  Translation: {result['timings']['translation']:.2f}s")
        print(f"  TTS: {result['timings']['tts']:.2f}s")
        print(f"  Total: {result['timings']['total']:.2f}s")
    
    print(f"\n✓ Translation completed successfully!")
    print(f"  Output saved to: {args.output}")


def main():
    """Main function to run examples"""
    
    print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║        Real-time Multilingual Speech-to-Speech Translation System         ║
║                                                                            ║
║  Features:                                                                 ║
║    • Whisper (small) for Speech-to-Text                                   ║
║    • IndicTrans2 for Translation (10+ Indian languages)                   ║
║    • Coqui TTS for Text-to-Speech                                         ║
║    • Optimized for RTX 4050 GPU (6GB VRAM)                                ║
║    • Float16 inference for memory efficiency                              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Check if running from command line with arguments
    if len(sys.argv) > 1:
        cli_interface()
        return
    
    # Otherwise, run examples
    print("\nRunning demonstration examples...")
    print("(Note: Make sure you have input audio files)")
    
    try:
        # Uncomment the examples you want to run
        
        # example_1_basic_usage()
        # example_2_detailed_usage()
        # example_3_batch_processing()
        # example_4_individual_modules()
        # example_5_multiple_languages()
        example_6_system_info()
        # example_7_error_handling()
        # example_8_custom_configuration()
        
        print("\n" + "=" * 80)
        print("Examples completed!")
        print("=" * 80)
        
        print("\nUsage:")
        print("  python main.py <input.wav> -s english -t hindi -o output.wav")
        print("\nFor more options:")
        print("  python main.py --help")
        
    except Exception as e:
        logger.error(f"Error running examples: {e}", exc_info=True)
        print(f"\nError: {e}")
        print("Make sure all dependencies are installed and models are downloaded.")


if __name__ == "__main__":
    main()
