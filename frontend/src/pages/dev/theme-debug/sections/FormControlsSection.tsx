import { Box, Text, VStack, HStack, Input, Textarea, Code, Checkbox, RadioGroup, Switch, Select, createListCollection } from "@chakra-ui/react";
import { useState } from "react";

/**
 * Form Controls Section - Comprehensive Form Input Patterns
 *
 * Demonstrates all form control types with their various states (default, hover, focus, disabled, error).
 * Per strategy doc: Uses `input` token for borders, `tertiary` for focus/active states, `primary` for checked states.
 */
export function FormControlsSection() {
  const [textValue, setTextValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [selectValue, setSelectValue] = useState(["option1"]);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("option1");
  const [switchChecked, setSwitchChecked] = useState(false);
  const [numberValue, setNumberValue] = useState(5);

  const selectCollection = createListCollection({
    items: [
      { label: "Option 1", value: "option1" },
      { label: "Option 2", value: "option2" },
      { label: "Option 3", value: "option3" },
    ],
  });

  const disabledSelectCollection = createListCollection({
    items: [
      { label: "Option 1", value: "option1" },
      { label: "Option 2", value: "option2" },
    ],
  });

  return (
    <Box id="form-controls" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Form Controls</Text>
      <VStack align="stretch" gap={4}>
        {/* Text Input States (5.2.a) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Text Input States</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <HStack gap={4} wrap="wrap" align="start">
                {/* Default */}
                <VStack align="start" gap={1} flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="medium">Default:</Text>
                  <Input
                    placeholder="Enter text"
                    borderColor="input"
                    bg="background"
                    color="foreground"
                    _hover={{ borderColor: "border-strong-01" }}
                    _focus={{ borderColor: "tertiary" }}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                  />
                </VStack>

                {/* Disabled */}
                <VStack align="start" gap={1} flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="medium">Disabled:</Text>
                  <Input
                    placeholder="Disabled input"
                    borderColor="input"
                    bg="background"
                    color="foreground"
                    disabled
                  />
                </VStack>

                {/* Error */}
                <VStack align="start" gap={1} flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="medium">Error:</Text>
                  <Input
                    placeholder="Error state"
                    borderColor="destructive"
                    bg="background"
                    color="foreground"
                    _focus={{ borderColor: "destructive" }}
                  />
                  <Text fontSize="xs" color="on-destructive">This field is required</Text>
                </VStack>
              </HStack>

              <Text fontSize="xs" color="foreground/60">
                Tokens: <Code fontSize="xs">input</Code> (border), <Code fontSize="xs">border-strong-01</Code> (hover), <Code fontSize="xs">tertiary</Code> (focus border)
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Textarea States (5.2.b) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Textarea States</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              {/* Default */}
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="medium">Default:</Text>
                <Textarea
                  placeholder="Enter multiline text"
                  borderColor="input"
                  bg="background"
                  color="foreground"
                  rows={3}
                  _hover={{ borderColor: "border-strong-01" }}
                  _focus={{ borderColor: "tertiary" }}
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                />
              </VStack>

              {/* Disabled */}
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="medium">Disabled:</Text>
                <Textarea
                  placeholder="Disabled textarea"
                  borderColor="input"
                  bg="background"
                  color="foreground"
                  rows={3}
                  disabled
                />
              </VStack>

              <Text fontSize="xs" color="foreground/60">
                Same token pattern as text inputs
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Select/Dropdown (5.2.c) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Select/Dropdown</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <HStack gap={4} wrap="wrap" align="start">
                {/* Default */}
                <VStack align="start" gap={1} flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="medium">Default:</Text>
                  <Select.Root
                    collection={selectCollection}
                    value={selectValue}
                    onValueChange={(details) => setSelectValue(details.value)}
                    positioning={{ placement: "bottom-start", gutter: 2 }}
                  >
                    <Select.Trigger
                      borderColor="input"
                      bg="background"
                      color="foreground"
                      _hover={{ borderColor: "border-strong-01", bg: "tertiary/8" }}
                      _focus={{ borderColor: "tertiary" }}
                    >
                      <Select.ValueText placeholder="Select option" />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Positioner>
                      <Select.Content
                        bg="muted"
                        borderColor="border"
                        color="foreground"
                      >
                        {selectCollection.items.map((item) => (
                          <Select.Item
                            key={item.value}
                            item={item}
                            _hover={{ bg: "tertiary", color: "on-tertiary" }}
                          >
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </VStack>

                {/* Disabled */}
                <VStack align="start" gap={1} flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="medium">Disabled:</Text>
                  <Select.Root
                    collection={disabledSelectCollection}
                    value={["option1"]}
                    disabled
                    positioning={{ placement: "bottom-start", gutter: 2 }}
                  >
                    <Select.Trigger
                      borderColor="input"
                      bg="background"
                      color="foreground"
                    >
                      <Select.ValueText placeholder="Select option" />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Positioner>
                      <Select.Content bg="muted" borderColor="border">
                        {disabledSelectCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </VStack>
              </HStack>

              <Text fontSize="xs" color="foreground/60">
                Tokens: Trigger uses <Code fontSize="xs">input</Code> border + <Code fontSize="xs">tertiary/8</Code> hover. Content uses <Code fontSize="xs">muted</Code> bg. Items use <Code fontSize="xs">tertiary</Code> + <Code fontSize="xs">on-tertiary</Code> on hover.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Checkbox States (5.2.d) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Checkbox States</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <HStack gap={6} wrap="wrap">
                {/* Unchecked */}
                <Checkbox.Root>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control
                    borderColor="input"
                    _checked={{ bg: "primary", borderColor: "primary" }}
                  >
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>Unchecked</Checkbox.Label>
                </Checkbox.Root>

                {/* Checked */}
                <Checkbox.Root
                  checked={checkboxChecked}
                  onCheckedChange={(e) => setCheckboxChecked(!!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control
                    borderColor="input"
                    _checked={{ bg: "primary", borderColor: "primary" }}
                  >
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>Checked</Checkbox.Label>
                </Checkbox.Root>

                {/* Disabled */}
                <Checkbox.Root disabled>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control borderColor="input">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>Disabled</Checkbox.Label>
                </Checkbox.Root>
              </HStack>

              <Text fontSize="xs" color="foreground/60">
                Checked state: <Code fontSize="xs">primary</Code> background, <Code fontSize="xs">on-primary</Code> checkmark
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Radio Button States (5.2.e) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Radio Button States</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <RadioGroup.Root value={radioValue} onValueChange={(e) => setRadioValue(e.value || "option1")}>
                <VStack align="start" gap={2}>
                  <RadioGroup.Item value="option1">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl
                      borderColor="input"
                      _checked={{ bg: "primary", borderColor: "primary" }}
                    />
                    <RadioGroup.ItemText>Option 1</RadioGroup.ItemText>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="option2">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl
                      borderColor="input"
                      _checked={{ bg: "primary", borderColor: "primary" }}
                    />
                    <RadioGroup.ItemText>Option 2</RadioGroup.ItemText>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="option3" disabled>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl borderColor="input" />
                    <RadioGroup.ItemText>Disabled</RadioGroup.ItemText>
                  </RadioGroup.Item>
                </VStack>
              </RadioGroup.Root>

              <Text fontSize="xs" color="foreground/60">
                Selected state: <Code fontSize="xs">primary</Code> fill with <Code fontSize="xs">on-primary</Code> dot
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Switch/Toggle States (5.2.f) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Switch/Toggle States</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <HStack gap={6} wrap="wrap">
                {/* Off */}
                <HStack>
                  <Switch.Root>
                    <Switch.HiddenInput />
                    <Switch.Control
                      bg="muted"
                      _checked={{ bg: "primary" }}
                    >
                      <Switch.Thumb bg="background" />
                    </Switch.Control>
                  </Switch.Root>
                  <Text fontSize="sm">Off</Text>
                </HStack>

                {/* On */}
                <HStack>
                  <Switch.Root
                    checked={switchChecked}
                    onCheckedChange={(e) => setSwitchChecked(!!e.checked)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control
                      bg="muted"
                      _checked={{ bg: "primary" }}
                    >
                      <Switch.Thumb bg="background" />
                    </Switch.Control>
                  </Switch.Root>
                  <Text fontSize="sm">On</Text>
                </HStack>

                {/* Disabled */}
                <HStack>
                  <Switch.Root disabled>
                    <Switch.HiddenInput />
                    <Switch.Control bg="muted">
                      <Switch.Thumb bg="background" />
                    </Switch.Control>
                  </Switch.Root>
                  <Text fontSize="sm">Disabled</Text>
                </HStack>
              </HStack>

              <Text fontSize="xs" color="foreground/60">
                Track uses <Code fontSize="xs">muted</Code> (off), <Code fontSize="xs">primary</Code> (on). Thumb uses <Code fontSize="xs">background</Code>
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Number Input with Steppers (5.2.g) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Number Input</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack align="stretch" gap={3}>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="medium">With steppers:</Text>
                <Input
                  type="number"
                  value={numberValue}
                  onChange={(e) => setNumberValue(Number(e.target.value))}
                  borderColor="input"
                  bg="background"
                  color="foreground"
                  maxW="200px"
                  _hover={{ borderColor: "border-strong-01" }}
                  _focus={{ borderColor: "tertiary" }}
                />
              </VStack>

              <Text fontSize="xs" color="foreground/60">
                Stepper buttons inherit browser defaults
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Implementation Note */}
        <Box p={4}>
          <Text fontSize="sm" color="foreground/80" fontStyle="italic" lineHeight="1.7">
            <strong>Implementation:</strong> All form controls follow consistent pattern: <Code fontSize="xs">input</Code> for default borders,
            <Code fontSize="xs">border-strong-01</Code> for hover, <Code fontSize="xs">tertiary</Code> for focus border.
            Checked/selected states use <Code fontSize="xs">primary</Code> with <Code fontSize="xs">on-primary</Code> for contrast.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
